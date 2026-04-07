// Product Page SSR — SEO-friendly product pages at /product/:slug
// Renders full HTML with meta tags, OG, Schema.org from Supabase
// Falls back to the SPA for user interaction
import https from 'https';
import { URL } from 'url';

var SU = process.env.SUPABASE_URL || 'https://yosjbsncvghpscsrvxds.supabase.co';
var SK = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc2pic25jdmdocHNjc3J2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjc3NTgsImV4cCI6MjA4NTgwMzc1OH0.PNEbeofoyT7KdkzepRfqg-zqyBiGAat5ElCMiyQ4UAs';
var SITE = 'https://seasaltpickles.com';
var WIX = 'https://static.wixstatic.com/media/';

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

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function resolveImg(img) {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  if (img.indexOf('~mv2') >= 0 || img.startsWith('163af4_') || img.startsWith('53b0e3_'))
    return WIX + img + '/v1/fill/w_800,h_800,al_c,q_85/image.jpg';
  return '';
}

function parseVariants(raw) {
  if (!raw) return [];
  try { var v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : [v]; } catch(e) { return []; }
}

export async function handler(event) {
  var slug = (event.path || '').replace(/^\/product\/?/, '').replace(/^\.netlify\/functions\/product-page\/?/, '').replace(/\/$/, '');
  var H = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' };

  if (!slug) {
    return { statusCode: 302, headers: { 'Location': '/' }, body: '' };
  }

  try {
    var rows = await supaGet('products?id=eq.' + encodeURIComponent(slug) + '&select=*');
    if (!Array.isArray(rows) || rows.length === 0) {
      // Try matching by name slug
      rows = await supaGet('products?select=*');
      rows = (rows || []).filter(function(p) {
        var ps = (p.id || p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return ps === slug.toLowerCase();
      });
    }
    if (!rows || rows.length === 0) {
      return { statusCode: 404, headers: H, body: notFound(slug) };
    }
    return { statusCode: 200, headers: H, body: productPage(rows[0]) };
  } catch(e) {
    return { statusCode: 500, headers: H, body: '<html><body>Error loading product</body></html>' };
  }
}

function productPage(p) {
  var title = p.seo_title || (p.name + ' | SeaSalt Pickles');
  var desc = p.seo_description || p.short_description || (p.description || '').substring(0, 160);
  var img = resolveImg(p.image || (p.images && p.images.length ? p.images[0] : ''));
  var variants = parseVariants(p.variants);
  var price = variants.length ? variants[0].price : 0;
  var keywords = '';
  if (p.tags && Array.isArray(p.tags)) keywords = p.tags.join(', ');
  else if (typeof p.tags === 'string') keywords = p.tags;
  if (!keywords) keywords = (p.name || '') + ', SeaSalt Pickles, Andhra pickles, homemade pickles';
  var url = SITE + '/product/' + (p.id || '');

  // Schema.org Product structured data
  var schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name || '',
    "description": desc,
    "image": img,
    "brand": { "@type": "Brand", "name": "SeaSalt Pickles" },
    "url": url,
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "INR",
      "lowPrice": price,
      "highPrice": variants.length > 1 ? variants[variants.length - 1].price : price,
      "offerCount": variants.length || 1,
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "SeaSalt Pickles" }
    }
  };

  var variantHtml = '';
  if (variants.length) {
    variantHtml = '<div class="variants">';
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      variantHtml += '<span class="variant-pill">' + esc(v.weight || v.size || '') + ' — ₹' + (v.price || 0) + '</span>';
    }
    variantHtml += '</div>';
  }

  var detailsHtml = '';
  if (p.oil_type || p.spice_level || p.shelf_life) {
    detailsHtml = '<div class="details">';
    if (p.oil_type) detailsHtml += '<span>Oil: ' + esc(p.oil_type) + '</span>';
    if (p.spice_level) detailsHtml += '<span>Spice: ' + esc(p.spice_level) + '</span>';
    if (p.shelf_life) detailsHtml += '<span>Shelf Life: ' + esc(p.shelf_life) + '</span>';
    detailsHtml += '</div>';
  }

  var ingredientsHtml = '';
  if (p.ingredients && Array.isArray(p.ingredients) && p.ingredients.length) {
    ingredientsHtml = '<div class="ingredients"><strong>Ingredients:</strong> ' + p.ingredients.map(esc).join(', ') + '</div>';
  }

  var tagsHtml = '';
  if (keywords) {
    tagsHtml = '<div class="tags">';
    keywords.split(',').forEach(function(k) { tagsHtml += '<span class="tag">' + esc(k.trim()) + '</span>'; });
    tagsHtml += '</div>';
  }

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + esc(title) + '</title>'
    + '<meta name="description" content="' + esc(desc) + '">'
    + '<meta name="keywords" content="' + esc(keywords) + '">'
    + '<meta name="robots" content="index, follow">'
    + '<link rel="canonical" href="' + esc(url) + '">'
    + '<meta property="og:title" content="' + esc(p.name) + ' | SeaSalt Pickles">'
    + '<meta property="og:description" content="' + esc(desc) + '">'
    + '<meta property="og:image" content="' + esc(img) + '">'
    + '<meta property="og:url" content="' + esc(url) + '">'
    + '<meta property="og:type" content="product">'
    + '<meta property="og:site_name" content="SeaSalt Pickles">'
    + '<meta property="product:price:amount" content="' + price + '">'
    + '<meta property="product:price:currency" content="INR">'
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:title" content="' + esc(p.name) + ' | SeaSalt Pickles">'
    + '<meta name="twitter:description" content="' + esc(desc) + '">'
    + '<meta name="twitter:image" content="' + esc(img) + '">'
    + '<script type="application/ld+json">' + JSON.stringify(schema) + '</script>'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    + '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">'
    + '<style>' + css() + '</style></head><body>'
    + nav()
    + '<main class="wrap"><div class="product">'
    + '<a href="/" class="back">← Back to Store</a>'
    + (img ? '<div class="product-img"><img src="' + esc(img) + '" alt="' + esc(p.name) + '"></div>' : '')
    + '<div class="product-info">'
    + '<span class="category">' + esc(p.category || '') + '</span>'
    + (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '')
    + '<h1>' + esc(p.name) + '</h1>'
    + '<div class="price">₹' + price + '</div>'
    + variantHtml
    + '<p class="description">' + esc(p.description || '') + '</p>'
    + detailsHtml
    + ingredientsHtml
    + '<a href="/" class="cta-btn">🛒 Order Now</a>'
    + tagsHtml
    + '</div></div></main>'
    + footer()
    + '</body></html>';
}

function notFound(slug) {
  return '<!DOCTYPE html><html><head><title>Not Found | SeaSalt Pickles</title><meta name="robots" content="noindex"></head><body>'
    + nav() + '<main class="wrap" style="text-align:center;padding:80px 20px;font-family:Outfit,sans-serif"><h1>Product Not Found</h1><p>Sorry, "' + esc(slug) + '" was not found.</p><a href="/">← Back to Store</a></main>'
    + footer() + '</body></html>';
}

function nav() {
  return '<header><div class="wrap nav-bar"><a href="/" class="logo">🫙 SeaSalt Pickles</a>'
    + '<nav><a href="/">Home</a><a href="/blog">Blog</a></nav></div></header>';
}

function footer() {
  return '<footer><div class="wrap"><p>© ' + new Date().getFullYear() + ' SeaSalt Pickles. Authentic Andhra Pickles, Hyderabad.</p></div></footer>';
}

function css() {
  return '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:Outfit,-apple-system,sans-serif;color:#1a1a2e;line-height:1.7;background:#fff}'
    + '.wrap{max-width:900px;margin:0 auto;padding:0 20px}'
    + 'header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:14px 0}'
    + '.nav-bar{display:flex;align-items:center;justify-content:space-between}'
    + '.logo{color:#fff;text-decoration:none;font-size:18px;font-weight:700}'
    + 'nav a{color:rgba(255,255,255,.6);text-decoration:none;margin-left:24px;font-size:14px;font-weight:500}nav a:hover{color:#fff}'
    + '.back{display:inline-block;color:#D4451A;text-decoration:none;font-weight:600;font-size:14px;margin:20px 0}'
    + '.product{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:20px 0 60px;align-items:start}'
    + '.product-img{border-radius:20px;overflow:hidden;background:#f8f7f4}'
    + '.product-img img{width:100%;height:auto;display:block}'
    + '.category{font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600}'
    + '.badge{background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-left:8px}'
    + 'h1{font-family:"Playfair Display",serif;font-size:32px;margin:8px 0 12px;line-height:1.2}'
    + '.price{font-size:28px;font-weight:800;color:#D4451A;margin-bottom:16px}'
    + '.variants{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}'
    + '.variant-pill{padding:8px 16px;border:2px solid #eee;border-radius:10px;font-size:14px;font-weight:500}'
    + '.description{font-size:15px;color:#555;margin-bottom:20px}'
    + '.details{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;font-size:13px;color:#666}'
    + '.details span{background:#f3f4f6;padding:4px 12px;border-radius:8px}'
    + '.ingredients{font-size:14px;color:#666;margin-bottom:20px}'
    + '.cta-btn{display:inline-block;background:linear-gradient(135deg,#D4451A,#ea580c);color:#fff;padding:16px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:16px;transition:.2s;box-shadow:0 4px 20px rgba(212,69,26,.3)}.cta-btn:hover{transform:translateY(-2px)}'
    + '.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px;padding-top:16px;border-top:1px solid #f0f0f0}'
    + '.tag{background:#f3f4f6;color:#555;padding:4px 12px;border-radius:20px;font-size:12px}'
    + 'footer{background:#1a1a2e;color:rgba(255,255,255,.6);padding:24px 0;margin-top:40px;text-align:center;font-size:13px}'
    + '@media(max-width:640px){.product{grid-template-columns:1fr}h1{font-size:24px}.price{font-size:24px}}';
}
