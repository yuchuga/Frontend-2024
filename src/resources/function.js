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

const radius = [1, 2, 3]
const area = function(radius){
  return Math.PI * radius * radius
};

const diameter = function(radius){
  return 2 * radius
};


/** Higher Order Function **/
const calculate = function(radius, logic){ 
  const output = []
  for(let i = 0; i < radius.length; i++){
      output.push(logic(radius[i]))
  }
  return output
};

console.log(calculate(radius, area)) //[3.14, 12.56, 28.27]
console.log(calculate(radius, diameter)) //[2, 4, 6]

//Global vs Block Scope
let a = 10 //global variable

for (i = 0; i < 1; i++) {
  var b = 20 //local variable
  let c = 30 //local variable
  console.log(c) //30
}
console.log(a) //10
console.log(b) //20
console.log(c) //undefined. Will print 30 if is var instead of let