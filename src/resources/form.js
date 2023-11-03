const handleChange = ({ target: { name, value } }) => {
  setState(prevState => ({ ...prevState, [name]: value }))
}

const handleChange1 = (e) => {
  setName(e.target.value)
}