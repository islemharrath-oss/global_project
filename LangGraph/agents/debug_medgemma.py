import os
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_HUB_OFFLINE'] = '1'

import torch
from PIL import Image
from transformers import AutoProcessor, AutoModelForImageTextToText, BitsAndBytesConfig

processor = AutoProcessor.from_pretrained(
    'google/medgemma-4b-it',
    local_files_only=True,
)

base = AutoModelForImageTextToText.from_pretrained(
    'google/medgemma-4b-it',
    local_files_only=True,
    quantization_config=BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16
    ),
    device_map={'': 'cuda:0'},
    torch_dtype=torch.float16,
    attn_implementation="eager",
)
model = base
model.eval()

image = Image.open('radio.jpg').convert('RGB')

# ── Test 1 : format texte simple sans chat template ──────────────
prompt = "Describe this chest X-ray in detail. FINDINGS:"

inputs = processor(
    images=image,
    text=prompt,
    return_tensors='pt'
)
inputs = {k: v.to(model.device) for k, v in inputs.items()}

print(f'input_ids shape: {inputs["input_ids"].shape}')

with torch.no_grad():
    out = model.generate(
        **inputs,
        max_new_tokens=200,
        min_new_tokens=30,
        do_sample=False,
        repetition_penalty=1.1,
    )

print(f'Tokens générés: {out.shape[1] - inputs["input_ids"].shape[1]}')
result = processor.decode(out[0], skip_special_tokens=True)
print('OUTPUT:', repr(result[-400:]))