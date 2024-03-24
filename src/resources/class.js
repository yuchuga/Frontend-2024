class Surgeon {
  constructor(name, department){
    this._name = name;
    this._department = department;
    this._remainingVacationDays = 20;
  }
  get name() { //get keyword
    return this._name //this keyword
  } 
  get department() {
    return this._department
  } 
  get remainingVacationDays() {
    return this._remainingVacationDays
  } 
  takeVacationDays(daysOff) {
    this._remainingVacationDays -= daysOff
  } 
}

const surgeonRomero = new Surgeon('Francisco Romero', 'Cardiovascular') //create new class
console.log(surgeonRomero.name) //Francisco Romero
surgeonRomero.takeVacationDays(3) //Method Call
console.log(surgeonRomero.remainingVacationDays) //print 17

/* Method */
const circle = {
  radius: 20,
  diameter() {
    return this.radius * 2
  },
  perimeter: function() { //note: return NaN for arrow function
    return 2 * Math.P * this.radius
  }
}
// console.log(circle.diameter()) //40
// console.log(circle.perimeter()) //125.6