# GDE JSON Endpoints (Template)

> Template only. Fill with real values from DevTools (Network) once discovered.

## list_courses
- URL: `...`
- Method: `GET`
- Headers: `...`
- Params: `year=YYYY`, `q?=...`, `limit?=...`, `offset?=...`
- Sample response:
```json
{
  "items": [
    { "id": "34", "code": "MC", "name": "Ciência da Computação" }
  ],
  "total": 0
}
```

## list_offers
- URL: `...`
- Method: `GET`
- Headers: `...`
- Params: `year=YYYY`, `courseId=...`, `term?=...`, `teacher?=...`
- Sample response:
```json
{
  "items": [
    { "courseCode": "MC202", "term": "2025-1", "classes": [] }
  ]
}
```

## get_curriculum
- URL: `...`
- Method: `GET`
- Headers: `...`
- Params: `courseId=...`, `year=YYYY`
- Sample response:
```json
{
  "nodes": [ { "code": "MC102", "name": "Algoritmos" } ],
  "edges": [ { "from": "MC102", "to": "MC202", "type": "prereq" } ]
}
```

## get_prereqs
- URL: `...`
- Method: `GET`
- Headers: `...`
- Params: `courseId=...`, `year=YYYY`
- Sample response:
```json
{
  "items": [ { "code": "MC202", "prereqs": ["MC102"] } ]
}
```

## get_semester_map
- URL: `...`
- Method: `GET`
- Headers: `...`
- Params: `courseId=...`, `year=YYYY`
- Sample response:
```json
{
  "items": [ { "code": "MC202", "recommendedSemester": 3 } ]
}
```

