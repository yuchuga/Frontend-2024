//Child Component
import React, { useContext } from "react"
import { UserContext } from './createContext'

const ComponentB = () => {
  const user = useContext(UserContext)

  return (
    <h2>{`Hello ${user}`}</h2> 
  )
}

export default ComponentB