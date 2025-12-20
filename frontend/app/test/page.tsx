"use client"

import React from 'react'

export default function TestPage() {
  console.log('=== TEST PAGE LOADING ===');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>Test Page</h1>
      <p>If you can see this, the frontend is working!</p>
      <button onClick={() => console.log('Button clicked!')}>
        Click me to test JavaScript
      </button>
    </div>
  )
} 