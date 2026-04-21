---
layout: default
title: Writing
---

<h1 class="page-title">Writing</h1>

<ul class="writing-list">
  {% assign pool = site.pages | where_exp: "p", "p.title" | sort: "title" %}
  {% for p in pool %}
    {% unless site.essay_deny_urls contains p.url %}
      {% assign slug = p.url | remove_first: "/" | split: "/" | first %}
      {% assign entry = site.data.writing | where: "slug", slug | first %}
      <li>
        <a href="{{ p.url }}">
          <strong>{{ p.title }}</strong>
          {% if entry %}<span>{{ entry.description }}</span>{% endif %}
        </a>
      </li>
    {% endunless %}
  {% endfor %}
</ul>
