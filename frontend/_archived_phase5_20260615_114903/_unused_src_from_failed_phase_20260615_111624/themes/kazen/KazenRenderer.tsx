
"use client";

export function KazenRenderer({ state, actions }: any) {
  return (
    <div style={{ background: "#f7f3ed", minHeight: "100vh" }}>
      <header style={{ padding: 20, fontSize: 20 }}>
        🇯🇵 Kazen Theme
      </header>

      <div style={{ padding: 20 }}>
        {state.items.map((item: any, i: number) => (
          <div
            key={i}
            style={{
              padding: 12,
              marginBottom: 10,
              background: "white",
              borderRadius: 12
            }}
            onClick={() => actions.setActiveItem(item)}
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
        background: "#fff"
      }}>
        Cart: {state.cart.length}
      </footer>
    </div>
  );
}
