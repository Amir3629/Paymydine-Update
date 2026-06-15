
"use client";

export function ModernGreenRenderer({ state, actions }: any) {
  return (
    <div style={{ background: "#0f2f24", minHeight: "100vh", color: "white" }}>
      <header style={{ padding: 20, fontSize: 20 }}>
        🌿 Modern Green
      </header>

      <div style={{ padding: 20 }}>
        {state.items.map((item: any, i: number) => (
          <div
            key={i}
            style={{
              padding: 12,
              marginBottom: 10,
              background: "#163d2f",
              borderRadius: 12
            }}
          >
            <div>{item.name}</div>
            <div>{item.price}</div>
            <button onClick={() => actions.addToCart(item)}>
              Add
            </button>
          </div>
        ))}
      </div>

      <footer style={{
        position: "fixed",
        bottom: 0,
        width: "100%",
        padding: 12,
        background: "#163d2f"
      }}>
        Cart: {state.cart.length}
      </footer>
    </div>
  );
}
