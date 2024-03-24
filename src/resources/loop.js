/** For Loop **/
const vacation = ['Bali', 'Paris', 'Greece', 'Alaska']
for (let i = 0; i < vacation.length; i++) { 
  console.log('I would love to visit ' + vacation[i])
  if (vacation[i] === 'Greece') {  
    break
  }
}; 

/** While Loop **/
var i = 1, j = 1
while (i < 4){
  j += i
  i += 1
  console.log('i', i) //2, 3, 4
  console.log('j', j) //2, 4, 7
};
console.log('I', i) //4
console.log('J', j) //7

/** Do While Loop **/
let x = 0
let i = 0
do {
  x = x + i
  i++
  console.log(x) //0, 1, 3, 6, 10
} while (i < 5)
console.log(x) //10

var j = 0
do {
  console.log(j) //1 to 19
  j++
} while(j < 20)

let countString = '' //string
let k = 0
do {
  countString = countString + k
  k++
  console.log(countString) //0, 01, 012, 0123, 01234
} while (k < 5)