import StatFilter from '@root/constants/statFilter';
import SelectOption from '../models/selectOption';

export default function filterSelectOptions(
  options: SelectOption[],
  statFilter: StatFilter,
  filterText: string,
) {
  if (statFilter === StatFilter.HideWon) {
    options = options.filter((option: SelectOption) => option.stats?.userTotal !== option.stats?.total);
  } else if (statFilter === StatFilter.ShowWon) {
    options = options.filter((option: SelectOption) => option.stats && option.stats?.userTotal === option.stats?.total);
  } else if (statFilter === StatFilter.ShowInProgress) {
    options = options.filter((option: SelectOption) => option.stats?.userTotal && option.stats.userTotal !== option.stats.total);
  }

  if (filterText.length > 0) {
    options = options.filter((option: SelectOption) => (option.text as string)?.toLowerCase().includes(filterText.toLowerCase()));
  }

  return options;
}
