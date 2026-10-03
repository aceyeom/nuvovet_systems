import { createContext, useContext } from 'react'

/** Console-wide state: the demo batch, the claim index and `go(href)` for keyboard / command navigation. */
export const ConsoleContext = createContext(null)
export const useConsole = () => useContext(ConsoleContext)
