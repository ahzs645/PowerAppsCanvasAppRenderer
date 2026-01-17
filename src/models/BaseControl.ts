export interface PropertyMetadata {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'color' | 'enum';
    defaultValue?: any;
    options?: string[];
    description?: string;
}

export abstract class BaseControl {
    abstract readonly type: string;
    abstract readonly properties: PropertyMetadata[];
    abstract readonly version: string;

    getAllowedProperties(): string[] {
        return this.properties.map(p => p.name);
    }

    getPropertyMetadata(name: string): PropertyMetadata | undefined {
        return this.properties.find(p => p.name === name);
    }
}
