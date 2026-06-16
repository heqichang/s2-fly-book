function ContactsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f6f7]">
      <div className="w-28 h-28 rounded-full bg-white shadow-sm flex items-center justify-center mb-6">
        <svg className="w-14 h-14 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-2">通讯录</h3>
      <p className="text-sm text-gray-400">从左侧选择联系人进行操作</p>
    </div>
  )
}

export default ContactsPage
