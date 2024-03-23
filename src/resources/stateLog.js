import React, { useState, useEffect } from 'react';

/* State Updates are Asynchronous */
//Functional Component
const [count, setCount] = useState('')

useEffect(() => {
  console.log(count)
}, [count]) //prevent infinite loop, unnecessary dependency will cause re-render

useEffect(() => {
  if (count) {
    executeFurtherLogic() //run other function after state update
  }
}, [count])

//Class Component
export default class Count extends React.Component {
  constructor(props) { //use props in constructor only. this.props in other sections
    super(props)
    this.state = {
      count: 0
    }
  };

  updateCount = () => {
    this.setState(prevState => ({
        count: prevState.count + 1
      }),
      () => console.log('state update', this.state) //callback function after state update
    );
  };

  render() {
    console.log('Render state', this.state)
    console.log('Props', this.props)

    return (
      <div></div>
    )
  }
}
