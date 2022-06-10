import { Dec, Int } from "@keplr-wallet/unit";

const zeroInt = new Int(0);
const twoInt = new Int(2);
const oneDec = new Dec(1);
const powPrecision = new Dec("0.00000001");

/**
 * Calculate the rational square of a rational number using a binomial series.
 * @param base base should be greater than 0 and less than 2.
 * @param exp
 */
export function powWithBinomialSeries(base: Dec, exp: Dec): Dec {
  // Exponentiation of a negative base with an arbitrary real exponent is not closed within the reals.
  // You can see this by recalling that `i = (-1)^(.5)`. We have to go to complex numbers to define this.
  // (And would have to implement complex logarithms)
  // We don't have a need for negative bases, so we don't include any such logic.
  if (!base.isPositive()) {
    throw new Error("base must be greater than 0");
  }
  // TODO: Remove this if we want to generalize the function,
  // we can adjust the algorithm in this setting.
  if (base.gte(new Dec("2"))) {
    throw new Error("base must be lesser than two");
  }

  // We will use an approximation algorithm to compute the power.
  // Since computing an integer power is easy, we split up the exponent into
  // an integer component and a fractional component.
  const integer = exp.truncate();
  const fractional = exp.sub(new Dec(integer));

  const integerPow = powInt(base, integer);

  if (fractional.isZero()) {
    return integerPow;
  }

  const fractionalPow = powFractionalWithBinomialSeries(
    base,
    fractional,
    powPrecision
  );

  return integerPow.mul(fractionalPow);
}

function powInt(base: Dec, power: Int): Dec {
  if (power.isNegative()) {
    return new Dec(1).quo(powInt(base, power.neg()));
  }

  if (power.equals(zeroInt)) {
    return oneDec;
  }
  let tmp = oneDec;

  for (let i = power; i.gt(new Int(1)); ) {
    if (!i.mod(twoInt).equals(zeroInt)) {
      tmp = tmp.mul(base);
    }
    i = i.div(twoInt);
    base = base.mul(base);
  }

  return base.mul(tmp);
}

function absDifferenceWithSign(a: Dec, b: Dec): [Dec, boolean] {
  if (a.gte(b)) {
    return [a.sub(b), false];
  } else {
    return [b.sub(a), true];
  }
}

function powFractionalWithBinomialSeries(
  base: Dec,
  exp: Dec,
  precision: Dec
): Dec {
  if (exp.isZero()) {
    return oneDec;
  }

  const a = exp;
  const [x, xneg] = absDifferenceWithSign(base, oneDec);
  let term = oneDec;
  let sum = oneDec;
  let negative = false;

  // TODO: Document this computation via taylor expansion
  for (let i = 1; term.gte(precision); i++) {
    const bigK = oneDec.mul(new Dec(i.toString()));
    const [c, cneg] = absDifferenceWithSign(a, bigK.sub(oneDec));
    term = term.mul(c.mul(x));
    term = term.quo(bigK);

    if (term.isZero()) {
      break;
    }
    if (xneg) {
      negative = !negative;
    }

    if (cneg) {
      negative = !negative;
    }

    if (negative) {
      sum = sum.sub(term);
    } else {
      sum = sum.add(term);
    }
  }
  return sum;
}
