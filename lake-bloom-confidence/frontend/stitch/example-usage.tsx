import { useEffect, useState } from "react";
import { Lake, PredictionExplanation, lakeBloomApi } from "./api-client";

export function LakeSearchExample() {
  const [lakes, setLakes] = useState<Lake[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    lakeBloomApi.listLakes().then(setLakes).catch(console.error);
  }, []);

  const filtered = lakes.filter((lake) =>
    `${lake.name} ${lake.state}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section>
      <input
        aria-label="Search lakes"
        placeholder="Search lakes"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul>
        {filtered.map((lake) => (
          <li key={lake.id}>{lake.name}, {lake.state}</li>
        ))}
      </ul>
    </section>
  );
}

export function LatestPredictionExample({ lakeId }: { lakeId: number }) {
  const [explanation, setExplanation] = useState<PredictionExplanation | null>(null);

  useEffect(() => {
    lakeBloomApi
      .getLatestPrediction(lakeId)
      .then((prediction) => lakeBloomApi.explainPrediction(prediction.id))
      .then(setExplanation)
      .catch(console.error);
  }, [lakeId]);

  if (!explanation) {
    return null;
  }

  return (
    <section>
      <h2>{explanation.label}</h2>
      <p>Bloom likelihood: {Math.round(explanation.bloom_probability * 100)}%</p>
      <p>Assessment confidence: {Math.round(explanation.confidence_score * 100)}%</p>
      <ul>
        {explanation.explanation.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <a href={explanation.advisory.url}>{explanation.advisory.label}</a>
      <p>{explanation.screening_notice}</p>
    </section>
  );
}
