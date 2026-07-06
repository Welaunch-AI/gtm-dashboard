export default function Loading() {
  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Bone w={200} h={26} />
        <Bone w={300} h={14} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[1,2,3].map(i => <Bone key={i} h={90} />)}
      </div>
      <Bone h={200} />
      <Bone h={200} />
      <Bone h={200} />
    </div>
  );
}

function Bone({ w, h }: { w?: number | string; h: number }) {
  return (
    <div style={{
      width: w ?? "100%",
      height: h,
      borderRadius: 10,
      background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "400% 100%",
      animation: "shimmer 1.4s ease infinite",
    }} />
  );
}
