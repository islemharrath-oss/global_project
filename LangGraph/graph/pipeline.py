from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional, List

from agents.classifier_agent import classifier_node
from agents.medgemma_agent   import medgemma_node
from agents.chexbert_agent   import chexbert_node   # contient la boucle Mistral↔CheXbert


class MedicalState(TypedDict):
    image_path:              str
    model_medgemma:          str
    model_mistral:           str
    labels:                  Optional[List[str]]
    is_normal:               Optional[bool]
    classifier_details:      Optional[dict]
    medical_report:          Optional[str]
    confirmed_labels:        Optional[List[str]]
    mistral_explanation:     Optional[str]
    report_for_chexbert:     Optional[str]
    final_labels:            Optional[List[str]]
    chexbert_details:        Optional[dict]
    xai_image:               Optional[str]


def build_graph():
    graph = StateGraph(MedicalState)

    graph.add_node("classifier", classifier_node)
    graph.add_node("medgemma",   medgemma_node)
    graph.add_node("chexbert",   chexbert_node)  # boucle Mistral↔CheXbert ici

    graph.set_entry_point("classifier")

    # Flux linéaire — chexbert_node gère lui-même le cas normal (is_normal=True)
    graph.add_edge("classifier", "medgemma")
    graph.add_edge("medgemma",   "chexbert")
    graph.add_edge("chexbert",   END)

    return graph.compile()


pipeline = build_graph()