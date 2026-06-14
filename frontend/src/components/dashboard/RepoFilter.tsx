interface RepoFilterProps {
  repos: { name: string; count: number }[];
  selected: string;
  onChange: (repo: string) => void;
}

export function RepoFilter({ repos, selected, onChange }: RepoFilterProps) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
    >
      <option value="all">All Repos ({repos.reduce((sum, r) => sum + r.count, 0)})</option>
      {repos.map((repo) => (
        <option key={repo.name} value={repo.name}>
          {repo.name} ({repo.count})
        </option>
      ))}
    </select>
  );
}
