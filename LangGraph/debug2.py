import os
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForImageTextToText, BitsAndBytesConfig

processor = AutoProcessor.from_pretrained('google/medgemma-4b-it')

model = AutoModelForImageTextToText.from_pretrained(
    'google/medgemma-4b-it',
    quantization_config=BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16
    ),
    device_map='auto',
    torch_dtype=torch.bfloat16,
)
model.eval()

image = Image.open('radio.jpg').convert('RGB')

messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": "Describe this chest X-ray. What are the findings?"},
        ]
    }
]

inputs = processor.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt"
)
inputs = {k: v.to(model.device) for k, v in inputs.items()}

input_len = inputs["input_ids"].shape[1]
print(f"Input tokens: {input_len}")

with torch.no_grad():
    out = model.generate(
        **inputs,
        max_new_tokens=300,
        do_sample=False,
    )

nouveaux_tokens = out[0][input_len:]
result = processor.decode(nouveaux_tokens, skip_special_tokens=True)
print(f"Tokens generes: {len(nouveaux_tokens)}")
print('OUTPUT:', result)