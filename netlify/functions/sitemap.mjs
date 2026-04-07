// Dynamic Sitemap — generates XML with all products + blog posts from Supabase
import https from 'https';
import { URL } from 'url';

var SU = process.env.SUPABASE_URL || 'https://yosjbsncvghpscsrvxds.supabase.co';
var SK = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
var SITE = 'https://seasaltpickles.com';

function supaGet(path) {
  return new Promise(function(resolve, reject) {
    var fullUrl = SU + '/rest/v1/' + path;
    var parsed = new URL(fullUrl);
    var req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET',
      headers: { 'apikey': SK, 'Authorization': 'Bearer ' + SK, 'Accept': 'application/json' },
      timeout: 10000
    }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { try { resolve(JSON.parse(data)); } catch(e) { resolve([]); } });
    });
    req.on('error', function() { resolve([]); });
    req.on('timeout', function() { req.destroy(); resolve([]); });
    req.end();
  });
}

export async function handler() {
  var today = new Date().toISOString().split('T')[0];
  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Homepage
  xml += '  <url><loc>' + SITE + '/</loc><lastmod>' + today + '</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n';
  // Blog listing
  xml += '  <url><loc>' + SITE + '/blog</loc><lastmod>' + today + '</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n';

  // All active products
  try {
    var products = await supaGet('products?is_active=eq.true&select=id,name,updated_at');
    if (Array.isArray(products)) {
      for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var slug = (p.id || '').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
        var mod = p.updated_at ? p.updated_at.split('T')[0] : today;
        xml += '  <url><loc>' + SITE + '/product/' + slug + '</loc><lastmod>' + mod + '</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n';
      }
    }
  } catch(e) {}

  // All published blog posts
  try {
    var blogs = await supaGet('blog_posts?status=eq.published&select=slug,published_at');
    if (Array.isArray(blogs)) {
      for (var i = 0; i < blogs.length; i++) {
        var b = blogs[i];
        var mod = b.published_at ? b.published_at.split('T')[0] : today;
        xml += '  <url><loc>' + SITE + '/blog/' + (b.slug || '') + '</loc><lastmod>' + mod + '</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n';
      }
    }
  } catch(e) {}

  xml += '</urlset>';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
    body: xml
  };
}
