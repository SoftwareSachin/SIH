declare module 'pdf-poppler' {
  interface ConvertOptions {
    type: string;
    size?: number;
    density?: number;
    outputdir: string;
    outputname: string;
    page?: number | null;
  }

  export function convert(filePath: string, options: ConvertOptions): Promise<string[]>;
}