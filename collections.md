---
layout: default
title: Collections
hidden: true
---

<h1 class="page-title">Collections</h1>

<ul class="essays-list" data-track-region="collections">
{% for e in site.data.collections %}
  {% assign slug = e.slug | append: "" %}
  {% assign url = "/" | append: slug | append: "/" %}
  {% assign p = site.pages | where: "url", url | first %}
  <li>
    <a href="{{ url }}"{% unless p.description %} class="title-only"{% endunless %}>
      <strong>{{ e.title }}</strong>
      {% if p.description %}<span>{{ p.description }}</span>{% endif %}
    </a>
  </li>
{% endfor %}
</ul>
