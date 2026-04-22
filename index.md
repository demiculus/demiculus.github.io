---
layout: default
title: Home
hidden: true
---

<section class="home-section">
<h3 class="section-label">Recent Essays</h3>
<ul class="essays-list">
{% for e in site.data.essays limit: 6 %}
  {% assign slug = e.slug | append: "" %}
  {% assign url = "/" | append: slug | append: "/" %}
  {% assign p = site.pages | where: "url", url | first %}
  <li>
    <a href="{{ url }}">
      <strong>{{ e.title }}</strong>
      <span>{% if p.description %}{{ p.description }}{% else %}{{ e.description }}{% endif %}</span>
    </a>
  </li>
{% endfor %}
</ul>
<p class="more-link"><a href="/essays">All essays →</a></p>
</section>
