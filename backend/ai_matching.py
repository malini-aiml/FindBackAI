from sentence_transformers import SentenceTransformer, util


# Load the pretrained AI text-embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")


def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Compare two item descriptions using semantic similarity.

    Returns:
        Similarity score from 0 to 100.
    """

    embeddings = model.encode(
        [text1, text2],
        convert_to_tensor=True
    )

    similarity = util.cos_sim(
        embeddings[0],
        embeddings[1]
    ).item()

    # Convert cosine similarity to a 0-100 score
    score = max(0, min(100, similarity * 100))

    return round(score, 2)