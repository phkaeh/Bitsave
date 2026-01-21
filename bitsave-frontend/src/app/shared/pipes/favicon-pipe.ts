import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'favicon', 
  standalone: true 
})
export class FaviconPipe implements PipeTransform {

  transform(website: string): string {
    const fallback = 'assets/LucideKey.png';
    if (!website) return fallback;
    try {
      let urlStr = website.trim();
      if (!urlStr.startsWith('http')) {
        urlStr = `https://${urlStr}`;
      }

      const domain = new URL(urlStr).hostname;
      const domainRegex = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
      if (!domainRegex.test(domain)) {
        return fallback;
      }
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    } catch {
      return fallback;
    }
  }
}