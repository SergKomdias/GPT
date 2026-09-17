// Contrasting conceptual and transfer checks alongside numerical practice.
type Choice = [string, string, string, string, string];
export const conceptChecks: Record<string, Choice[]> = {
  arithmetic: [
    [
      'Why is 2 + 3 × 4 equal to 14?',
      'Multiplication is done before addition.',
      'Addition is always first.',
      'Work only left to right.',
      'All operations are interchangeable.',
    ],
    [
      'A student says 8 ÷ 2 × 2 = 2. What is the error?',
      'Division and multiplication go left to right.',
      'Division is always last.',
      'Multiplication is always first.',
      'Eight divided by two is two.',
    ],
  ],
  expressions: [
    ['In 4x + 3, which part is the coefficient of x?', '4', 'x', '3', '7'],
    ['Which expression means three less than twice n?', '2n − 3', '3 − 2n', '2(n − 3)', '3n − 2'],
  ],
  brackets: [
    [
      'Which identity is valid?',
      '2(x + 3) = 2x + 6',
      '2(x + 3) = 2x + 3',
      '2(x + 3) = x + 6',
      '2(x + 3) = 5x',
    ],
    [
      'Why is −(x − 4) = −x + 4?',
      'The factor −1 multiplies both terms.',
      'Only x changes sign.',
      'Four is always positive.',
      'Subtraction can be ignored.',
    ],
  ],
  linear: [
    [
      'Which operation preserves an equation?',
      'Subtract the same value from both sides.',
      'Subtract only from the left.',
      'Square only the right side.',
      'Delete a nonzero term.',
    ],
    [
      'Solve 2(x + 1) = 2x + 2.',
      'Every real x works.',
      'Only x = 0.',
      'No solution.',
      'Only x = 2.',
    ],
  ],
  systems: [
    [
      'Two distinct parallel lines represent a system with ___.',
      'no solution',
      'one solution',
      'two solutions',
      'infinitely many solutions',
    ],
    [
      'For x+y=5 and x−y=1, adding equations eliminates ___.',
      'y',
      'x',
      'both variables',
      'neither variable',
    ],
  ],
  powers: [
    ['Which equals x² × x³?', 'x⁵', 'x⁶', '2x⁵', 'x⁹'],
    [
      'Why does (−3)² differ from −3²?',
      'Parentheses determine whether the sign is squared.',
      'They never differ.',
      'Squares are negative.',
      'Exponents apply to no signs.',
    ],
  ],
  roots: [
    ['The principal square root of 25 is ___.', '5', '−5', 'both 5 and −5', '625'],
    [
      'Which is true for real x?',
      '√(x²) = |x|',
      '√(x²) = x for every x',
      '√(x²) = −x for every x',
      '√(x²) = x²',
    ],
  ],
  quadratic: [
    ['How many distinct real roots does x² + 1 = 0 have?', '0', '1', '2', '3'],
    [
      'A student divides x(x−3)=0 by x and gets only x=3. What was lost?',
      'The root x=0.',
      'The root x=−3.',
      'No root was lost.',
      'All real numbers.',
    ],
  ],
  functions: [
    [
      'A function assigns each allowed input ___.',
      'exactly one output',
      'at least two outputs',
      'no output',
      'every possible output',
    ],
    ['If f(x)=2x+1, which input gives output 9?', '4', '9', '5', '18'],
  ],
  angles: [
    [
      'Vertically opposite angles are ___.',
      'equal',
      'always 90°',
      'always supplementary',
      'always 180°',
    ],
    ['Two complementary angles sum to ___.', '90°', '180°', '270°', '360°'],
  ],
  triangles: [
    ['Which lengths cannot form a triangle?', '2, 3, 6', '3, 4, 5', '5, 5, 6', '4, 4, 4'],
    [
      'Two equal sides imply ___.',
      'two equal opposite angles',
      'all angles are 90°',
      'all sides are different',
      'area is zero',
    ],
  ],
  polygons: [
    [
      'A diagonal joins ___.',
      'nonadjacent vertices',
      'adjacent vertices only',
      'a vertex to itself',
      'centres of two circles',
    ],
    [
      'Why does a pentagon have angle sum 540°?',
      'It can be split into three triangles.',
      'It has five right angles.',
      'Every side adds 180°.',
      'It is always regular.',
    ],
  ],
  circles: [
    ['If radius doubles, circumference ___.', 'doubles', 'quadruples', 'halves', 'stays unchanged'],
    [
      'Which statement distinguishes radius and diameter?',
      'Diameter is twice the radius.',
      'Radius is twice the diameter.',
      'They are always equal.',
      'Diameter measures area.',
    ],
  ],
  area: [
    [
      'If both sides of a rectangle double, its area ___.',
      'quadruples',
      'doubles',
      'halves',
      'stays unchanged',
    ],
    [
      'A student gives area in metres. What should change?',
      'Use square metres.',
      'Use cubic metres.',
      'Remove all units.',
      'Use seconds.',
    ],
  ],
  volume: [
    ['If a cube edge doubles, volume increases by factor ___.', '8', '2', '4', '6'],
    ['Which unit measures volume?', 'cm³', 'cm²', 'cm', 'kg'],
  ],
  distance: [
    [
      'A runner returns to the starting point. Distance travelled is ___.',
      'positive if they moved',
      'always zero',
      'negative',
      'equal to displacement magnitude always',
    ],
    ['Which quantity describes path length?', 'distance', 'velocity', 'acceleration', 'force'],
  ],
  speed: [
    ['Speed is the rate of change of ___.', 'distance travelled', 'mass', 'force', 'energy only'],
    [
      'Equal distances at different speeds: average speed is ___.',
      'total distance divided by total time',
      'always the arithmetic mean',
      'the faster speed',
      'the slower speed',
    ],
  ],
  acceleration: [
    [
      'A car slows down while moving forward. Its acceleration ___.',
      'can point backwards',
      'must be zero',
      'must point forwards',
      'equals its speed',
    ],
    [
      'Changing direction at constant speed implies ___.',
      'nonzero acceleration',
      'zero acceleration always',
      'zero velocity',
      'infinite mass',
    ],
  ],
  uniform: [
    [
      'Uniform straight-line motion has ___.',
      'constant velocity',
      'increasing acceleration',
      'zero distance',
      'changing speed',
    ],
    [
      'On a distance-time graph, uniform motion is ___.',
      'a straight line with constant slope',
      'always a horizontal line',
      'a parabola',
      'a circle',
    ],
  ],
  accelerated: [
    [
      'From rest with constant acceleration, distance is proportional to ___.',
      'time squared',
      'time only',
      'inverse time',
      'mass squared',
    ],
    [
      'Why cannot s=vt with final v be used directly during acceleration?',
      'Velocity changes during the interval.',
      'Time has no units.',
      'Distance is negative.',
      'Final speed is always zero.',
    ],
  ],
  force: [
    [
      'Two equal opposite forces on one object have net force ___.',
      'zero',
      'twice either force',
      'one of the forces',
      'infinite',
    ],
    [
      'Net force changes an object’s ___.',
      'velocity',
      'mass necessarily',
      'material necessarily',
      'temperature necessarily',
    ],
  ],
  mass: [
    ['Mass measures ___.', 'inertia', 'gravitational force in newtons', 'speed', 'volume only'],
    [
      'The same net force on twice the mass produces ___.',
      'half the acceleration',
      'twice the acceleration',
      'the same acceleration',
      'zero acceleration',
    ],
  ],
  newton: [
    [
      'An object with zero net force can ___.',
      'move at constant velocity',
      'only remain at rest',
      'accelerate continuously',
      'have no mass',
    ],
    [
      'An action-reaction pair acts on ___.',
      'different objects',
      'the same object',
      'no objects',
      'one object at different times',
    ],
  ],
  work: [
    [
      'A force perpendicular to displacement does work equal to ___.',
      'zero',
      'force times distance always',
      'kinetic energy always',
      'power',
    ],
    [
      'Lifting a box at constant speed increases its ___.',
      'gravitational potential energy',
      'mass',
      'speed',
      'electric charge',
    ],
  ],
  power: [
    [
      'Two motors do equal work; the faster one has ___.',
      'greater power',
      'less power',
      'equal power necessarily',
      'greater mass necessarily',
    ],
    ['A kilowatt-hour is a unit of ___.', 'energy', 'power', 'force', 'voltage'],
  ],
  energy: [
    ['Doubling speed at fixed mass multiplies kinetic energy by ___.', '4', '2', '8', '1'],
    [
      'In an ideal falling system, potential energy becomes ___.',
      'kinetic energy',
      'mass',
      'electric charge',
      'nothing',
    ],
  ],
  voltage: [
    ['Voltage is energy transferred per unit ___.', 'charge', 'time', 'mass', 'distance'],
    [
      'A voltmeter is normally connected ___.',
      'in parallel',
      'in series only',
      'instead of the battery',
      'with no connection',
    ],
  ],
  current: [
    ['Electric current is charge flow per unit ___.', 'time', 'distance', 'mass', 'resistance'],
    [
      'An ammeter is normally connected ___.',
      'in series',
      'in parallel across the battery',
      'with an open circuit',
      'without wires',
    ],
  ],
  resistance: [
    [
      'At fixed voltage, increasing resistance makes current ___.',
      'decrease',
      'increase',
      'stay fixed always',
      'infinite',
    ],
    ['Resistance is measured in ___.', 'ohms', 'amperes', 'volts', 'watts'],
  ],
  ohm: [
    [
      'For an ohmic resistor at constant temperature, I is proportional to ___.',
      'voltage',
      'voltage squared',
      'inverse voltage',
      'time only',
    ],
    [
      'Why specify constant temperature when using a fixed resistance?',
      'Resistance can change with temperature.',
      'Voltage has no units.',
      'Current stops at all temperatures.',
      'Ohm’s law describes gravity.',
    ],
  ],
  'electric-power': [
    [
      'At fixed voltage, twice the current means ___.',
      'twice the power',
      'half the power',
      'four times the power',
      'unchanged power',
    ],
    ['A 60 W lamp on for 2 h uses ___.', '120 Wh', '30 Wh', '62 Wh', '120 W'],
  ],
  series: [
    [
      'In a series circuit, current through each component is ___.',
      'the same',
      'always different',
      'zero',
      'equal to voltage',
    ],
    [
      'If one series connection breaks, ___.',
      'current stops throughout that path',
      'other resistors become zero',
      'voltage becomes infinite',
      'the circuit stays closed',
    ],
  ],
  parallel: [
    [
      'Parallel branches share the same ___.',
      'voltage',
      'current necessarily',
      'resistance necessarily',
      'power necessarily',
    ],
    [
      'Adding another resistor in parallel makes equivalent resistance ___.',
      'smaller',
      'larger',
      'unchanged',
      'negative',
    ],
  ],
};
