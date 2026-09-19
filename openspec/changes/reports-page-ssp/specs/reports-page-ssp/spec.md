# reports-page-ssp Specification

## Purpose

Define `/reportes` behavior when it uses the shared `data-table-ssp` and `pagination-dtos` capabilities. This spec covers reports-page tab coordination, preserved filters, and export behavior only.

## Requirements

### Requirement: `/reportes` MUST preserve both report tabs

The reports page SHALL continue to render the `Consolidado` and `Detalle` tabs. Switching tabs MUST NOT remove the other tab’s configuration or break the page-level filter bar.

#### Scenario: Page renders both tabs

- GIVEN a user opens `/reportes`
- WHEN the page loads
- THEN both `Consolidado` and `Detalle` tabs are available
- AND the shared date-range, group-by, and type filters remain visible

### Requirement: Each tab MUST maintain independent pagination and search state

The system MUST keep separate `page`, `limit`, and `search` state for each tab. Changing one tab SHALL NOT overwrite the other tab’s state.

#### Scenario: Switching tabs preserves state

- GIVEN `Detalle` is on page 3 with search `gomez`
- WHEN the user switches to `Consolidado` and changes its search
- THEN `Detalle` still remembers page 3 and search `gomez`
- AND `Consolidado` uses its own current page and search

### Requirement: `Detalle` MUST use shared SSP pagination and search

`Detalle` SHALL behave like a list view and MUST use the shared SSP pattern from `data-table-ssp` and `pagination-dtos`. Its query MUST support `page`, `limit`, `search`, and the existing report filters.

#### Scenario: Detail list paginates results

- GIVEN `Detalle` has many matching rows for the active filters
- WHEN the user requests page 2
- THEN the page loads only page 2 of `Detalle` rows
- AND the response includes pagination metadata

#### Scenario: Detail search applies with existing filters

- GIVEN `Detalle` is filtered by a date range and type
- WHEN the user searches for `maria`
- THEN the search applies within the same date range and type filters
- AND pagination resets only for `Detalle`

### Requirement: `Consolidado` MUST preserve grouped summary behavior

`Consolidado` SHALL keep grouped summary semantics. If pagination is shown, it MAY page grouped results rather than raw rows, but it MUST remain consistent with the active group-by, date-range, and type filters.

#### Scenario: Consolidated grouping remains stable

- GIVEN `Consolidado` is grouped by the selected dimension
- WHEN the user changes page
- THEN the grouped totals remain correct for that grouping
- AND the active filters still apply

### Requirement: Export actions MUST remain page-level and use active tab filters

Export actions SHALL remain on the page, not inside table rows. When triggered, they MUST use the currently active tab and its filter state, including the preserved date-range, group-by, type, and tab search values.

#### Scenario: Export respects active tab filters

- GIVEN `Detalle` is the active tab with search `juan`
- WHEN the user exports the report
- THEN the export uses `Detalle` plus its current filters
- AND it does not use stale filters from `Consolidado`

#### Scenario: Export remains available after tab changes

- GIVEN the user switches from `Consolidado` to `Detalle`
- WHEN the page is displayed again
- THEN the export controls are still available at page level
- AND they continue to act on the active tab
