/** Callback Functions 
  Accepts functions as arguments & invoke/call it in outer function
  Run async operations as code runs sequentially in javascript
**/
function message() {
  console.log('Message is shown after 3 seconds')
}
setTimeout(() => { 
  message()
}, 3000);


const person = {
  name: 'John',
  age: 30,
  location: 'Dubai'
};