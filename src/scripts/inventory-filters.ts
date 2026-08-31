type InventoryFilterControl = HTMLInputElement | HTMLSelectElement;

const inventoryBody = document.querySelector<HTMLTableSectionElement>('#inventory-body');
const inventoryFilterCount = document.querySelector<HTMLElement>('#inventory-filter-count');
const inventoryFilterReset = document.querySelector<HTMLButtonElement>('#inventory-filter-reset');
const inventoryFilters = Array.from(
  document.querySelectorAll<InventoryFilterControl>('[data-inventory-filter]'),
);

function normalizeFilterText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-CH')
    .trim();
}

function parseNumericValue(value: string): number | null {
  let cleaned = value
    .replace(/CHF/gi, '')
    .replace(/[’'\s]/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!cleaned) return null;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesNumericFilter(cellText: string, rawFilter: string): boolean {
  const cellValue = parseNumericValue(cellText);
  if (cellValue === null) return false;

  const filter = rawFilter.trim().replace(/CHF/gi, '').replace(/[’'\s]/g, '');
  if (!filter) return true;

  const range = filter.match(/^(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)$/);
  if (range) {
    const from = Number(range[1].replace(',', '.'));
    const to = Number(range[2].replace(',', '.'));
    return cellValue >= Math.min(from, to) && cellValue <= Math.max(from, to);
  }

  const comparison = filter.match(/^(<=|>=|<|>|=)?(-?\d+(?:[.,]\d+)?)$/);
  if (!comparison) {
    return normalizeFilterText(cellText).includes(normalizeFilterText(rawFilter));
  }

  const operator = comparison[1] || '=';
  const expected = Number(comparison[2].replace(',', '.'));
  if (operator === '>') return cellValue > expected;
  if (operator === '>=') return cellValue >= expected;
  if (operator === '<') return cellValue < expected;
  if (operator === '<=') return cellValue <= expected;
  return Math.abs(cellValue - expected) < 0.000001;
}

function dataRows(): HTMLTableRowElement[] {
  if (!inventoryBody) return [];
  return Array.from(inventoryBody.rows).filter((row) =>
    row.cells.length === 9 && !row.querySelector('.shop-empty'),
  );
}

function rowMatches(row: HTMLTableRowElement): boolean {
  return inventoryFilters.every((control) => {
    const rawFilter = control.value.trim();
    if (!rawFilter) return true;

    const columnIndex = Number(control.dataset.inventoryFilter);
    const cellText = row.cells[columnIndex]?.textContent || '';

    if (control.dataset.filterType === 'number') {
      return matchesNumericFilter(cellText, rawFilter);
    }

    const cellValue = normalizeFilterText(cellText);
    const filterValue = normalizeFilterText(rawFilter);
    return control instanceof HTMLSelectElement
      ? cellValue === filterValue
      : cellValue.includes(filterValue);
  });
}

function applyInventoryFilters(): void {
  const rows = dataRows();
  let visibleRows = 0;

  rows.forEach((row) => {
    const visible = rowMatches(row);
    row.hidden = !visible;
    if (visible) visibleRows += 1;
  });

  if (inventoryFilterCount) {
    inventoryFilterCount.textContent = rows.length
      ? `${visibleRows} von ${rows.length} Zeilen angezeigt`
      : 'Keine Artikel vorhanden';
  }

  if (inventoryFilterReset) {
    inventoryFilterReset.disabled = !inventoryFilters.some((control) => control.value.trim());
  }
}

inventoryFilters.forEach((control) => {
  control.addEventListener('input', applyInventoryFilters);
  control.addEventListener('change', applyInventoryFilters);
});

inventoryFilterReset?.addEventListener('click', () => {
  inventoryFilters.forEach((control) => {
    control.value = '';
  });
  applyInventoryFilters();
  inventoryFilters[0]?.focus();
});

if (inventoryBody) {
  const observer = new MutationObserver(() => applyInventoryFilters());
  observer.observe(inventoryBody, { childList: true });
}

applyInventoryFilters();
