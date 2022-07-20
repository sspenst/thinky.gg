import SelectOption from '../models/selectOption';

export default function filterSelectOptions(
  options: SelectOption[],
  showFilter: string,
  filterText: string,
) {
  if (showFilter === 'hide_won') {
    options = options.filter((option: SelectOption) => option.stats?.userTotal !== option.stats?.total);
  } else if (showFilter === 'only_attempted') {
    options = options.filter((option: SelectOption) => option.stats?.userTotal && option.stats?.userTotal !== option?.stats?.total);
  }

  if (filterText.length > 0) {
    options = options.filter((option: SelectOption) => option.text?.toLowerCase().includes(filterText.toLowerCase()));
  }

  return options;
}
