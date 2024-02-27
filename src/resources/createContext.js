import React, { createContext, useState } from "react";

export const UserContext = createContext()

//Parent Component
const ComponentA = () => {
  const [user, setUser] = useState('Jasmine')
  
  return (
    <UserContext.Provider value={user}>
      <Component />
    </UserContext.Provider>
  )
}

export default ComponentA