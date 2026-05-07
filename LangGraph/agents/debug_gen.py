import os
import torch
from medgemma_agent import get_medgemma_model, _build_agent2_prompt, _parse_report_sections
from PIL import Image

model_path = r"C:\Users\amine\Desktop\PCD\global_project\LangGraph\models\medgemma-mimic-lora-final"
image_path = r"C:\Users\amine\Desktop\PCD\global_project\backend\media\xrays\MIMIC-CXR-Chest-X-Ray-00.jpeg"
cnn_labels = ['Cardiomegaly', 'Lung Opacity']

model, processor = get_medgemma_model(model_path)
image = Image.open(image_path).convert("RGB")
prompt = _build_agent2_prompt(cnn_labels)

messages = [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": prompt}]}]
text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

inputs = processor(images=image, text=text, return_tensors="pt")
inputs = {k: v.to(model.device) for k, v in inputs.items()}

# Ensure pixel_values are in the correct dtype
if "pixel_values" in inputs:
    inputs["pixel_values"] = inputs["pixel_values"].to(model.dtype)

with torch.no_grad():
    output = model.generate(
        **inputs,
        max_new_tokens=20,
        do_sample=False,
        num_beams=1,
        repetition_penalty=1.1,
        pad_token_id=processor.tokenizer.pad_token_id,
        eos_token_id=processor.tokenizer.eos_token_id,
        use_cache=True,
    )

print("Output shape:", output.shape)
print("Output tokens:", output[0].tolist())

generated_text = processor.decode(output[0], skip_special_tokens=True)
print("Generated text:", generated_text)
