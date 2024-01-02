import React, { useState, useEffect } from 'react'
import useDebounce from "../hooks/useDebounce"

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const debounceSearchTerm = useDebounce(searchTerm, 500)

  const handleChange = (e) => {
    // console.log(e.target.value)
    setSearchTerm(e.target.value)
  }

  useEffect(() => {
    console.log('searchTerm', searchTerm)
  }, [debounceSearchTerm])

  return (
    <div>
      <input
        type='text'
        value={searchTerm}
        onChange={handleChange}
        placeholder='Pls enter name'
      />
    </div>
  )
}

export default Search