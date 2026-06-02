export class DualNumber {
  constructor(public r: number, public m: number = 0) {}

  add(other: DualNumber): DualNumber {
    return new DualNumber(this.r + other.r, this.m + other.m);
  }

  sub(other: DualNumber): DualNumber {
    return new DualNumber(this.r - other.r, this.m - other.m);
  }

  mul(scalar: number): DualNumber {
    return new DualNumber(this.r * scalar, this.m * scalar);
  }

  div(scalar: number): DualNumber {
    if (Math.abs(scalar) < 1e-9) throw new Error("Ділення на нуль");
    return new DualNumber(this.r / scalar, this.m / scalar);
  }

  isNegative(): boolean {
    if (this.m < -1e-7) return true;
    if (Math.abs(this.m) <= 1e-7 && this.r < -1e-7) return true;
    return false;
  }

  // Додано для перевірки критерію максимізації
  isPositive(): boolean {
    if (this.m > 1e-7) return true;
    if (Math.abs(this.m) <= 1e-7 && this.r > 1e-7) return true;
    return false;
  }

  compareTo(other: DualNumber): number {
    const mDiff = this.m - other.m;
    if (Math.abs(mDiff) > 1e-7) return mDiff;
    return this.r - other.r;
  }

  toString(): string {
    const format = (n: number) => {
      const fixed = n.toFixed(2);
      return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed;
    };

    if (Math.abs(this.m) <= 1e-7) return format(this.r);
    if (Math.abs(this.r) <= 1e-7) {
      if (Math.abs(this.m - 1) <= 1e-7) return 'M';
      if (Math.abs(this.m + 1) <= 1e-7) return '-M';
      return `${format(this.m)}M`;
    }

    const sign = this.m > 0 ? '+' : '';
    const mStr = Math.abs(this.m - 1) <= 1e-7 && this.m > 0 ? 'M' :
                 Math.abs(this.m + 1) <= 1e-7 ? '-M' : `${format(this.m)}M`;

    return `${format(this.r)}${sign}${mStr}`;
  }
}