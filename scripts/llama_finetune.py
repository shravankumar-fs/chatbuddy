import json
import os
from typing import List, Dict
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import LoraConfig, get_peft_model
import torch
from datasets import load_dataset

def prepare_training_data(input_file: str) -> List[Dict]:
    """Prepare training data from JSONL file."""
    training_data = []
    with open(input_file, 'r') as f:
        for line in f:
            data = json.loads(line)
            training_data.append({
                "instruction": data["instruction"],
                "input": data.get("input", ""),
                "output": data["output"]
            })
    return training_data

def create_prompt(data: Dict) -> str:
    """Create formatted prompt for fine-tuning."""
    return f"""Below is an instruction that describes a task. Write a response that appropriately completes the request.

### Instruction:
{data['instruction']}

### Input:
{data['input']}

### Response:
{data['output']}"""

def main():
    # Configuration
    model_name = "meta-llama/Llama-2-7b-hf"
    output_dir = "./llama-finetuned"
    
    # Load training data
    training_data = prepare_training_data("data/llama-finetune/training_data.jsonl")
    
    # Load tokenizer and model
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        device_map="auto"
    )
    
    # Configure LoRA
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none"
    )
    
    # Apply LoRA
    model = get_peft_model(model, lora_config)
    
    # Prepare dataset
    def tokenize_function(examples):
        prompts = [create_prompt(data) for data in examples]
        return tokenizer(prompts, padding="max_length", truncation=True, max_length=512)
    
    # Convert to HuggingFace dataset
    dataset = load_dataset('json', data_files={'train': 'data/llama-finetune/training_data.jsonl'})
    tokenized_dataset = dataset.map(tokenize_function, batched=True)
    
    # Training arguments
    training_args = {
        "output_dir": output_dir,
        "per_device_train_batch_size": 4,
        "gradient_accumulation_steps": 4,
        "learning_rate": 1e-4,
        "num_train_epochs": 3,
        "logging_steps": 10,
        "save_steps": 100,
        "evaluation_strategy": "steps",
        "eval_steps": 50,
        "save_total_limit": 2,
        "remove_unused_columns": False,
        "gradient_checkpointing": True
    }
    
    # Initialize optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=training_args["learning_rate"])
    
    # Train the model
    model.train()
    global_step = 0
    for epoch in range(training_args["num_train_epochs"]):
        print(f"\nStarting epoch {epoch + 1}/{training_args['num_train_epochs']}")
        for step, batch in enumerate(tokenized_dataset["train"]):
            outputs = model(**batch)
            loss = outputs.loss
            loss.backward()
            
            if (step + 1) % training_args["gradient_accumulation_steps"] == 0:
                optimizer.step()
                optimizer.zero_grad()
                
                if (global_step + 1) % training_args["logging_steps"] == 0:
                    print(f"Step {global_step + 1}: Loss = {loss.item()}")
                
                if (global_step + 1) % training_args["save_steps"] == 0:
                    model.save_pretrained(os.path.join(output_dir, f"checkpoint-{global_step + 1}"))
                    
                global_step += 1

    # Save the final model
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print("Model saved successfully!", file=sys.stderr)

if __name__ == "__main__":
    main()
