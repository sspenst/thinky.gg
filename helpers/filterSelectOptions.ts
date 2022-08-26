import SelectOption from '../models/selectOption';

export enum FilterSelectOption {
  All = 'all',
  HideWon = 'hide_won',
  ShowInProgress = 'only_attempted',
}

export default function filterSelectOptions(
  options: SelectOption[],
  showFilter: FilterSelectOption,
  filterText: string,
) {
  if (showFilter === FilterSelectOption.HideWon) {
    options = options.filter((option: SelectOption) => option.stats?.userTotal !== option.stats?.total);
  } else if (showFilter === FilterSelectOption.ShowInProgress) {
    options = options.filter((option: SelectOption) => option.stats?.userTotal && option.stats?.userTotal !== option?.stats?.total);
  }

  if (filterText.length > 0) {
    options = options.filter((option: SelectOption) => option.text?.toLowerCase().includes(filterText.toLowerCase()));
  }

  return options;
}
