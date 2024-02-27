import React, { useState } from 'react'

const api = () => {
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState([])
  const [error, setError] = useState(null)

  const queryParams ={
    id: 2,
    name: 'shirt'
  }
  const queryString = new URLSearchParams(queryParams).toString(); 
  console.log(queryString)
  const url = `https://fakestoreapi.com/products?${queryParams}`

  const form = {
    name: 'John',
    email: 'john@gmail.com',
    password: 'john123@'
  };

  const postComments = async (form) => {
    try {
      setLoading(true)
      const response = await fetch('https://api.example.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json() //object
      setComments([ ...comments, data ]) //add 
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  //ES6
  const getProducts = async () => {
    try {
      const response = await fetch('https://fakestoreapi.com/products')
      if (response.ok) {
        const data = await response.json()
        console.log('data', data)
      } else {
        if (response.status === 404) throw new Error('404 not found')
        if (response.status === 500) throw new Error('500 Internal Server Error')
      }
    } catch (e) {
      console.error(e)
    }
  };

  //ES5
  const getProduct = async () => {
    fetch('https://fakestoreapi.com/products')
    .then((response) => {
      if (response.ok) {
        return response.json()
      }
    })
    .then((data) => {
      console.log('data', data)
    })
    .catch((err) => {
      console.error(err)
    })
  };

   return (
    <div>api</div>
  )
}

export default api;