export type AvatarUser = { id: number; name: string; avatarAt: number | null };

/** Ảnh đại diện tròn; chưa có ảnh → chữ cái đầu tên trên nền vàng. className: kích thước + cỡ chữ */
export default function Avatar({ user, className }: { user: AvatarUser; className: string }) {
  if (user.avatarAt) {
    // ?v= đổi mỗi lần đổi ảnh → trình duyệt không dùng ảnh cũ trong cache
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/v1/avatar/${user.id}?v=${user.avatarAt}`} alt="" className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-gold font-extrabold text-[#2b1520]`}>
      {user.name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
