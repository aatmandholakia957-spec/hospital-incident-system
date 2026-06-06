const paginate = (total, page, limit) => {
  page = Number(page);
  limit = Number(limit);
  const pages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
};

module.exports = { paginate };
