import numpy as np
from collections import Counter

class MetricsTracker:
    def __init__(self):
        self.total_requests = 0
        self.error_count = 0
        self.diagnose_calls = 0
        self.ood_rejections = 0
        self.total_diagnoses = 0
        self.disease_counts = Counter()
        self.confidences = []
        self.diagnose_latencies = []
        self.inference_latencies = []

    def record_request(self, status_code: int):
        self.total_requests += 1
        if status_code >= 400:
            self.error_count += 1

    def record_diagnose_call(self):
        self.diagnose_calls += 1

    def record_ood_rejection(self):
        self.ood_rejections += 1

    def record_successful_diagnosis(self, slug: str, confidence: float):
        self.total_diagnoses += 1
        self.disease_counts[slug] += 1
        self.confidences.append(confidence)

    def record_diagnose_latency(self, latency_ms: float):
        self.diagnose_latencies.append(latency_ms)

    def record_inference_latency(self, latency_ms: float):
        self.inference_latencies.append(latency_ms)

    def get_metrics(self) -> dict:
        error_rate = 0.0
        if self.total_requests > 0:
            error_rate = self.error_count / self.total_requests
            
        ood_rejection_rate = 0.0
        if self.diagnose_calls > 0:
            ood_rejection_rate = self.ood_rejections / self.diagnose_calls

        avg_confidence = 0.0
        if self.confidences:
            avg_confidence = float(np.mean(self.confidences))

        # Get top 5 predicted diseases distribution
        top_5_distribution = dict(self.disease_counts.most_common(5))

        # Overall diagnose latency percentiles
        p50_diagnose = 0.0
        p95_diagnose = 0.0
        if self.diagnose_latencies:
            latencies = np.array(self.diagnose_latencies)
            p50_diagnose = float(np.percentile(latencies, 50))
            p95_diagnose = float(np.percentile(latencies, 95))

        # Raw inference latency percentiles
        p50_inference = 0.0
        p95_inference = 0.0
        if self.inference_latencies:
            infer_latencies = np.array(self.inference_latencies)
            p50_inference = float(np.percentile(infer_latencies, 50))
            p95_inference = float(np.percentile(infer_latencies, 95))
            
        return {
            "total_requests": self.total_requests,
            "error_rate": error_rate,
            "diagnose_calls": self.diagnose_calls,
            "ood_rejections": self.ood_rejections,
            "ood_rejection_rate": ood_rejection_rate,
            "total_diagnoses": self.total_diagnoses,
            "predicted_diseases_distribution_top_5": top_5_distribution,
            "average_confidence": avg_confidence,
            "diagnose_p50_latency_ms": p50_diagnose,
            "diagnose_p95_latency_ms": p95_diagnose,
            "inference_p50_latency_ms": p50_inference,
            "inference_p95_latency_ms": p95_inference
        }

metrics_tracker = MetricsTracker()
