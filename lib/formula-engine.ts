export type FormulaTaxBracket = {
  from: number
  to: number | null
  factor: number
  rebate: number
}

export type FormulaEvaluationOptions = {
  taxBrackets?: FormulaTaxBracket[]
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma'; value: ',' }
  | { type: 'eof'; value: '' }

const IDENTIFIER = /^[A-Z_][A-Z0-9_]*$/
const MAX_EXPRESSION_LENGTH = 4000
const MAX_TOKENS = 1000
const MAX_DEPTH = 80

function finite(value: number, label = 'resultado') {
  if (!Number.isFinite(value)) throw new Error(`La fórmula produjo un ${label} no finito.`)
  if (Math.abs(value) > 1e18) throw new Error('La fórmula produjo un valor fuera del rango permitido.')
  return value
}

function tokenize(expression: string): Token[] {
  const source = expression.trim().toUpperCase()
  if (!source) throw new Error('La fórmula está vacía.')
  if (source.length > MAX_EXPRESSION_LENGTH) throw new Error('La fórmula supera el largo permitido.')

  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (/\d|\./.test(char)) {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?/)
      if (!match) throw new Error(`Número inválido cerca de “${source.slice(index, index + 12)}”.`)
      const value = Number(match[0])
      if (!Number.isFinite(value)) throw new Error('La fórmula contiene un número inválido.')
      tokens.push({ type: 'number', value })
      index += match[0].length
      continue
    }

    if (/[A-Z_]/.test(char)) {
      const match = source.slice(index).match(/^[A-Z_][A-Z0-9_]*/)
      if (!match) throw new Error('Identificador inválido.')
      tokens.push({ type: 'identifier', value: match[0] })
      index += match[0].length
      continue
    }

    const two = source.slice(index, index + 2)
    if (['<=', '>=', '==', '!='].includes(two)) {
      tokens.push({ type: 'operator', value: two })
      index += 2
      continue
    }

    if ('+-*/%^<>'.includes(char)) {
      tokens.push({ type: 'operator', value: char })
      index += 1
      continue
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char })
      index += 1
      continue
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: ',' })
      index += 1
      continue
    }

    throw new Error(`Símbolo no permitido en la fórmula: “${char}”.`)
  }

  if (tokens.length > MAX_TOKENS) throw new Error('La fórmula es demasiado compleja.')
  tokens.push({ type: 'eof', value: '' })
  return tokens
}

class Parser {
  private index = 0
  private depth = 0

  constructor(
    private readonly tokens: Token[],
    private readonly variables: Record<string, number>,
    private readonly options: FormulaEvaluationOptions,
  ) {}

  parse() {
    const value = this.comparison()
    if (this.current().type !== 'eof') throw new Error('La fórmula contiene texto o símbolos después del resultado.')
    return finite(value)
  }

  private current() {
    return this.tokens[this.index]
  }

  private consume() {
    const token = this.current()
    this.index += 1
    return token
  }

  private currentOperator(allowed: string[]) {
    const token = this.current()
    return token.type === 'operator' && allowed.includes(token.value) ? token.value : null
  }

  private consumeOperator() {
    const token = this.consume()
    if (token.type !== 'operator') throw new Error('Se esperaba un operador.')
    return token.value
  }

  private withDepth<T>(callback: () => T): T {
    this.depth += 1
    if (this.depth > MAX_DEPTH) throw new Error('La fórmula tiene demasiados niveles de anidación.')
    try {
      return callback()
    } finally {
      this.depth -= 1
    }
  }

  private comparison(): number {
    let left = this.additive()
    let operator = this.currentOperator(['<', '<=', '>', '>=', '==', '!='])
    while (operator) {
      this.consumeOperator()
      const right = this.additive()
      left = operator === '<' ? Number(left < right)
        : operator === '<=' ? Number(left <= right)
          : operator === '>' ? Number(left > right)
            : operator === '>=' ? Number(left >= right)
              : operator === '==' ? Number(left === right)
                : Number(left !== right)
      operator = this.currentOperator(['<', '<=', '>', '>=', '==', '!='])
    }
    return left
  }

  private additive(): number {
    let value = this.multiplicative()
    let operator = this.currentOperator(['+', '-'])
    while (operator) {
      this.consumeOperator()
      const right = this.multiplicative()
      value = operator === '+' ? value + right : value - right
      finite(value)
      operator = this.currentOperator(['+', '-'])
    }
    return value
  }

  private multiplicative(): number {
    let value = this.power()
    let operator = this.currentOperator(['*', '/', '%'])
    while (operator) {
      this.consumeOperator()
      const right = this.power()
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('La fórmula intentó dividir por cero.')
      value = operator === '*' ? value * right : operator === '/' ? value / right : value % right
      finite(value)
      operator = this.currentOperator(['*', '/', '%'])
    }
    return value
  }

  private power(): number {
    let value = this.unary()
    if (this.currentOperator(['^']) === '^') {
      this.consumeOperator()
      value = Math.pow(value, this.power())
      finite(value)
    }
    return value
  }

  private unary(): number {
    const operator = this.currentOperator(['+', '-'])
    if (operator) {
      this.consumeOperator()
      const value = this.unary()
      return operator === '-' ? -value : value
    }
    return this.primary()
  }

  private primary(): number {
    return this.withDepth(() => {
      const token = this.current()
      if (token.type === 'number') {
        this.consume()
        return token.value
      }

      if (token.type === 'identifier') {
        const name = token.value
        this.consume()
        if (this.current().type === 'paren' && this.current().value === '(') {
          this.consume()
          const args: number[] = []
          if (!(this.current().type === 'paren' && this.current().value === ')')) {
            while (true) {
              args.push(this.comparison())
              if (this.current().type === 'comma') {
                this.consume()
                continue
              }
              break
            }
          }
          if (!(this.current().type === 'paren' && this.current().value === ')')) throw new Error(`Falta “)” en ${name}.`)
          this.consume()
          return this.callFunction(name, args)
        }

        if (!IDENTIFIER.test(name)) throw new Error(`Variable inválida: ${name}.`)
        if (!(name in this.variables)) throw new Error(`La variable ${name} no está disponible para esta fórmula.`)
        return finite(Number(this.variables[name]), `valor de ${name}`)
      }

      if (token.type === 'paren' && token.value === '(') {
        this.consume()
        const value = this.comparison()
        if (!(this.current().type === 'paren' && this.current().value === ')')) throw new Error('Falta un paréntesis de cierre.')
        this.consume()
        return value
      }

      throw new Error('La fórmula contiene una expresión incompleta.')
    })
  }

  private callFunction(name: string, args: number[]): number {
    switch (name) {
      case 'MIN':
        if (args.length < 1) throw new Error('MIN requiere al menos un argumento.')
        return finite(Math.min(...args))
      case 'MAX':
        if (args.length < 1) throw new Error('MAX requiere al menos un argumento.')
        return finite(Math.max(...args))
      case 'ROUND': {
        if (args.length < 1 || args.length > 2) throw new Error('ROUND recibe uno o dos argumentos.')
        if (args.length === 1) return Math.round(args[0])
        const decimals = Math.max(-12, Math.min(12, Math.trunc(args[1])))
        const factor = 10 ** decimals
        return finite(Math.round(args[0] * factor) / factor)
      }
      case 'FLOOR':
        if (args.length !== 1) throw new Error('FLOOR recibe un argumento.')
        return Math.floor(args[0])
      case 'CEIL':
        if (args.length !== 1) throw new Error('CEIL recibe un argumento.')
        return Math.ceil(args[0])
      case 'ABS':
        if (args.length !== 1) throw new Error('ABS recibe un argumento.')
        return Math.abs(args[0])
      case 'IF':
        if (args.length !== 3) throw new Error('IF requiere condición, valor verdadero y valor falso.')
        return args[0] !== 0 ? args[1] : args[2]
      case 'AND':
        if (args.length < 2) throw new Error('AND requiere al menos dos argumentos.')
        return Number(args.every((value) => value !== 0))
      case 'OR':
        if (args.length < 2) throw new Error('OR requiere al menos dos argumentos.')
        return Number(args.some((value) => value !== 0))
      case 'NOT':
        if (args.length !== 1) throw new Error('NOT recibe un argumento.')
        return Number(args[0] === 0)
      case 'TAX_BRACKET': {
        if (args.length !== 1) throw new Error('TAX_BRACKET recibe la base de impuesto.')
        const base = Math.max(0, args[0])
        const bracket = [...(this.options.taxBrackets ?? [])]
          .sort((a, b) => a.from - b.from)
          .find((item) => base >= item.from && (item.to === null || base <= item.to))
        if (!bracket) return 0
        return Math.round(Math.max(0, base * bracket.factor - bracket.rebate))
      }
      default:
        throw new Error(`La función ${name} no está permitida.`)
    }
  }
}

export function evaluateFormula(
  expression: string,
  variables: Record<string, number>,
  options: FormulaEvaluationOptions = {},
) {
  const normalizedVariables: Record<string, number> = {}
  for (const [key, value] of Object.entries(variables)) {
    const normalized = key.trim().toUpperCase()
    if (!IDENTIFIER.test(normalized)) continue
    normalizedVariables[normalized] = finite(Number(value), `valor de ${normalized}`)
  }
  return new Parser(tokenize(expression), normalizedVariables, options).parse()
}

export function validateFormulaExpression(
  expression: string,
  allowedVariables: string[],
  options: FormulaEvaluationOptions = {},
) {
  const variables = Object.fromEntries(allowedVariables.map((key) => [key.toUpperCase(), 1]))
  evaluateFormula(expression, variables, options)
  return true
}
