import React from 'react'
import { createRoot } from 'react-dom/client'
import SQLNoteApp from './SQLNoteApp'
import './reset.css'

const root = createRoot(document.getElementById('root'))
root.render(<SQLNoteApp />)
