"use client"

import React from 'react'

export default function SimpleTest() {
  console.log('SIMPLE TEST PAGE LOADING');
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
      <h1>🚨 SIMPLE TEST PAGE 🚨</h1>
      <p>If you can see this red background, the frontend is working!</p>
      <button 
        onClick={() => alert('JavaScript is working!')}
        style={{ padding: '10px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Click me to test JavaScript
      </button>
    </div>
  )
} 