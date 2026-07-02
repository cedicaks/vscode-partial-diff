export interface Comparison {
    textKey1: string;
    textKey2: string;
}

export default class LastComparisonStore {
    private comparison?: Comparison;

    set(comparison: Comparison): void {
        this.comparison = comparison;
    }

    get(): Comparison | undefined {
        return this.comparison;
    }
}
