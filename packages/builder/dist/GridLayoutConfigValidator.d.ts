import { CodebaseView } from '@a24z/core-library';
export interface GridConfigValidationIssue {
    code: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
    details?: any;
}
export interface GridConfigValidationReport {
    valid: boolean;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    issues: GridConfigValidationIssue[];
    suggestions: string[];
}
/**
 * Validates a CodebaseView to ensure it's properly formed and usable
 */
export declare function validateCodebaseViewConfig(config: CodebaseView): GridConfigValidationReport;
/**
 * Auto-fix common issues in a GridLayoutConfig
 */
export declare function autoFixGridConfig(config: CodebaseView): CodebaseView;
//# sourceMappingURL=GridLayoutConfigValidator.d.ts.map