//Functional - state updates
useEffect(() => {
  console.log(state)
}, [state])

//Class - state updates
render() {
  console.log('Render state', this.state)
  console.log('Props', this.props)
  return (
    <div></div>
  )
}
