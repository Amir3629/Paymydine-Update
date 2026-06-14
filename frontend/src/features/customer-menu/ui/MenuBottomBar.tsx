"use client";

export function MenuBottomBar({ state, actions }: any) {
  const theme = state.theme;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-around p-3 bg-white border-t">
      <button onClick={() => actions.callWaiter()}>
        {theme === "modern-green" ? "🍃 Waiter" : "Waiter"}
      </button>

      <button onClick={() => actions.addNote()}>
        Note
      </button>

      <button onClick={() => actions.checkout()}>
        Checkout
      </button>
    </div>
  );
}