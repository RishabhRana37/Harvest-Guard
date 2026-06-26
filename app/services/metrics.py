import numpy as np

class MetricsTracker:
    def __init__(self):
        self.total_requests = 0
        self.error_count = 0
        self.ood_rejections = 0
        self.diagnose_latencies = []

    def record_request(self, status_code: int):
        self.total_requests += 1
        if status_code >= 400:
            self.error_count += 1

    def record_ood_rejection(self):
        self.ood_rejections += 1

    def record_diagnose_latency(self, latency_ms: float):
        self.diagnose_latencies.append(latency_ms)

    def get_metrics(self) -> dict:
        error_rate = 0.0
        if self.total_requests > 0:
            error_rate = self.error_count / self.total_requests
            
        p50 = 0.0
        p95 = 0.0
        if self.diagnose_latencies:
            latencies = np.array(self.diagnose_latencies)
            p50 = float(np.percentile(latencies, 50))
            p95 = float(np.percentile(latencies, 95))
            
        return {
            "total_requests": self.total_requests,
            "error_rate": error_rate,
            "ood_rejections": self.ood_rejections,
            "diagnose_p50_latency_ms": p50,
            "diagnose_p95_latency_ms": p95
        }

metrics_tracker = MetricsTracker()
