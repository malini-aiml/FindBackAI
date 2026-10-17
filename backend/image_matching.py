from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch

# Load pretrained CLIP model
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")


def calculate_image_similarity(image1_path: str, image2_path: str) -> float:
    """
    Compare two item images using CLIP embeddings.

    Returns:
        Similarity score from 0 to 100.
    """

    image1 = Image.open(image1_path).convert("RGB")
    image2 = Image.open(image2_path).convert("RGB")

    inputs = processor(
        images=[image1, image2],
        return_tensors="pt"
    )

    with torch.no_grad():
        image_features = model.get_image_features(
            pixel_values=inputs["pixel_values"]
        )

    # Normalize embeddings
    image_features = image_features / image_features.norm(
        dim=-1,
        keepdim=True
    )

    # Cosine similarity
    similarity = torch.matmul(
        image_features[0],
        image_features[1]
    ).item()

    # Convert to 0-100
    score = max(0, min(100, similarity * 100))

    return round(score, 2)